import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface PatientMedicalInfo {
    id: string;
    user_id: string;
    height: number;        // cm
    weight: number;        // kg
    bmi: number;           // auto-calculated
    blood_type: BloodType;
    profile_picture_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface PatientMedicalFormData {
    height: string;
    weight: string;
    blood_type: BloodType | '';
    profile_picture_uri?: string | null;  // local URI from image picker
}

// ---------------------------------------------------------------------------
// BMI Calculation (client-side for real-time preview)
// ---------------------------------------------------------------------------

export function calculateBMI(heightCm: number, weightKg: number): string {
    if (heightCm <= 0 || weightKg <= 0) return '--';
    const heightM = heightCm / 100;
    return (weightKg / (heightM * heightM)).toFixed(1);
}

// ---------------------------------------------------------------------------
// Fetch medical info for a user
// ---------------------------------------------------------------------------

export async function fetchMedicalInfo(userId: string): Promise<PatientMedicalInfo | null> {
    const { data, error } = await supabase
        .from('patient_medical_info')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching medical info:', error);
        return null;
    }
    return data;
}

// ---------------------------------------------------------------------------
// Upload profile picture to Supabase Storage
// ---------------------------------------------------------------------------


async function uploadProfilePicture(userId: string, localUri: string): Promise<string | null> {
    try {
        // Handle space in path (common on Windows)
        const sanitizedUri = localUri.includes(' ') ? encodeURI(localUri) : localUri;

        // Determine the file extension
        const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `${userId}/profile_picture.${ext}`;
        const contentType = `image/${ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext}`;

        // Prepare the file body
        let fileBody: any;

        if (Platform.OS === 'web') {
            const response = await fetch(sanitizedUri);
            fileBody = await response.blob();
        } else {
            const response = await fetch(sanitizedUri);
            if (!response.ok) {
                throw new Error(`Failed to fetch local file: ${response.statusText}`);
            }
            fileBody = await response.arrayBuffer();
        }

        // Upload (upsert to overwrite existing)
        const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(filePath, fileBody, {
                cacheControl: '3600',
                upsert: true,
                contentType: contentType,
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return null;
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

        return urlData?.publicUrl ?? null;
    } catch (err) {
        console.error('Profile picture upload failed:', err);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Save (insert or update) medical info
// ---------------------------------------------------------------------------

export async function saveMedicalInfo(
    userId: string,
    formData: PatientMedicalFormData,
    existingRecord?: PatientMedicalInfo | null,
): Promise<{ success: boolean; data?: PatientMedicalInfo; error?: string }> {
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);

    // Validation
    if (isNaN(height) || height <= 0) return { success: false, error: 'Height must be a positive number.' };
    if (isNaN(weight) || weight <= 0) return { success: false, error: 'Weight must be a positive number.' };
    if (!formData.blood_type) return { success: false, error: 'Blood type is required.' };

    // Calculate BMI (also done server-side via trigger, but we send it for consistency)
    const bmi = parseFloat(calculateBMI(height, weight));

    // Handle profile picture upload
    let profilePictureUrl = existingRecord?.profile_picture_url ?? null;
    if (formData.profile_picture_uri) {
        const url = await uploadProfilePicture(userId, formData.profile_picture_uri);
        if (url) {
            profilePictureUrl = url;
        }
    }

    // Verify session/user still exists to prevent FK violation 23503
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    if (!currentUserId || currentUserId !== userId) {
        return { 
            success: false, 
            error: 'Authentication session expired or invalid. Please log in again.' 
        };
    }

    const record = {
        user_id: currentUserId,
        height,
        weight,
        bmi,
        blood_type: formData.blood_type,
        profile_picture_url: profilePictureUrl,
    };

    if (existingRecord) {
        // UPDATE
        const { data, error } = await supabase
            .from('patient_medical_info')
            .update(record)
            .eq('id', existingRecord.id)
            .select()
            .single();

        if (error) {
            console.error('Update medical info error:', error);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } else {
        // INSERT
        const { data, error } = await supabase
            .from('patient_medical_info')
            .insert(record)
            .select()
            .single();

        if (error) {
            console.error('Insert medical info error:', error);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    }
}

// ---------------------------------------------------------------------------
// Pick image from gallery
// ---------------------------------------------------------------------------

export async function pickProfileImage(): Promise<string | null> {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
    }
    return null;
}
