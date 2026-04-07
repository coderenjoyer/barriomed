import { supabase } from './supabase';
import { Alert, Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Cross-platform confirmation helper
// ---------------------------------------------------------------------------
/**
 * Shows a confirmation dialog.
 * - On web: uses window.confirm (Alert.alert is a no-op in browsers).
 * - On mobile: uses Alert.alert with a destructive action button.
 *
 * @param title   Dialog title
 * @param message Body text
 * @param onConfirm Callback invoked when the user presses OK / Confirm
 */
export function crossPlatformConfirm(
    title: string,
    message: string,
    onConfirm: () => void,
): void {
    if (Platform.OS === 'web') {
        // window.confirm is synchronous on web
        const ok = window.confirm(`${title}\n\n${message}`);
        if (ok) onConfirm();
        return;
    }
    Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
}

// The single canonical value that identifies a patient row in public.users.
// All queries that touch patient-scoped data MUST filter on this.
// Matches the 'user_role' enum defined in backend/user.sql.
export const PATIENT_ROLE = 'patient' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MedicalRecord {
    id: string;
    patient_id: string;
    doctor_id: string;
    title: string;
    description: string;
    diagnosis: string;
    created_at: string;
    updated_at: string;
    updated_by: string;
}

export interface MedicalRecordInput {
    patient_id: string;
    doctor_id: string;
    title: string;
    description: string;
    diagnosis: string;
}

export interface PrescriptionMedication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
}

export interface Prescription {
    id: string;
    patient_id: string;
    doctor_id: string;
    medications: PrescriptionMedication[];
    instructions: string;
    created_at: string;
    // Joined doctor info
    doctor_name?: string;
}

export interface PrescriptionInput {
    patient_id: string;
    doctor_id: string;
    medications: PrescriptionMedication[];
    instructions: string;
}

export interface ConsultationRecord {
    id: string;
    patient_id: string;
    doctor_id: string;
    notes: string;
    diagnosis: string;
    prescription_id: string | null;
    timestamp: string;
    // Joined info
    doctor_name?: string;
    patient_name?: string;
}

export interface ConsultationInput {
    patient_id: string;
    doctor_id: string;
    notes: string;
    diagnosis: string;
    prescription_id?: string | null;
}

// Represents the unified patient profile a doctor sees
export interface PatientSummary {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    created_at: string;
    // From patient_medical_info
    height: number | null;
    weight: number | null;
    blood_type: string | null;
    bmi: number | null;
    profile_picture_url: string | null;
}

// ---------------------------------------------------------------------------
// Patient Search (Supabase)
// ---------------------------------------------------------------------------

/**
 * Shared select fragment for the patient list.
 * patient_medical_info is embedded via the FK alias created by the
 * 20260321_patient_medical_info_fk.sql migration.
 */
const PATIENT_SELECT = `
    id,
    first_name,
    last_name,
    email,
    role,
    created_at,
    patient_medical_info!fk_pmi_public_user (
        height,
        weight,
        blood_type,
        bmi,
        profile_picture_url
    )
` as const;

/**
 * Returns users whose role = 'patient'.
 * Optionally filtered by name / email when query is non-empty.
 * Non-patient roles are ALWAYS excluded at the query level.
 */
export async function searchPatients(query: string): Promise<PatientSummary[]> {
    let req = supabase
        .from('users')
        .select(PATIENT_SELECT)
        // ── Role guard: only patient rows ──────────────────────────
        .eq('role', PATIENT_ROLE)
        .limit(50);

    if (query.trim()) {
        req = req.or(
            `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`
        );
    }

    const { data, error } = await req;

    if (error) {
        console.error('[searchPatients] error:', error);
        return [];
    }
    return mapPatients(data ?? []);
}

function mapPatients(rows: any[]): PatientSummary[] {
    return rows
        // Double-check at the application layer — belt-and-suspenders
        .filter((r) => r.role === PATIENT_ROLE)
        .map((r) => {
            const info = Array.isArray(r.patient_medical_info)
                ? r.patient_medical_info[0]
                : r.patient_medical_info;
            return {
                id: r.id,
                first_name: r.first_name,
                last_name: r.last_name,
                email: r.email,
                created_at: r.created_at,
                height: info?.height ?? null,
                weight: info?.weight ?? null,
                blood_type: info?.blood_type ?? null,
                bmi: info?.bmi ?? null,
                profile_picture_url: info?.profile_picture_url ?? null,
            };
        });
}

/**
 * Fetches a single user by ID.
 * Returns null if the user does NOT have role='patient' — prevents
 * a doctor from accidentally loading a staff or admin profile.
 */
export async function fetchPatientById(patientId: string): Promise<PatientSummary | null> {
    const { data, error } = await supabase
        .from('users')
        .select(PATIENT_SELECT)
        .eq('id', patientId)
        // ── Role guard: reject non-patients at the DB level ────────
        .eq('role', PATIENT_ROLE)
        .maybeSingle();

    if (error) {
        console.error('[fetchPatientById] error:', error);
        return null;
    }
    // Null means either the user doesn't exist OR they are not a patient
    if (!data) return null;

    const info = Array.isArray(data.patient_medical_info)
        ? data.patient_medical_info[0]
        : data.patient_medical_info;

    return {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        created_at: data.created_at,
        height: info?.height ?? null,
        weight: info?.weight ?? null,
        blood_type: info?.blood_type ?? null,
        bmi: info?.bmi ?? null,
        profile_picture_url: info?.profile_picture_url ?? null,
    };
}

// ---------------------------------------------------------------------------
// Medical Records CRUD
// ---------------------------------------------------------------------------

export async function fetchMedicalRecords(patientId: string): Promise<MedicalRecord[]> {
    const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[fetchMedicalRecords] error:', error);
        return [];
    }
    return data ?? [];
}

export async function createMedicalRecord(
    input: MedicalRecordInput,
): Promise<{ success: boolean; data?: MedicalRecord; error?: string }> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('medical_records')
        .insert({
            ...input,
            updated_by: input.doctor_id,
            created_at: now,
            updated_at: now,
        })
        .select()
        .single();

    if (error) {
        console.error('[createMedicalRecord] error:', error);
        return { success: false, error: error.message };
    }
    return { success: true, data };
}

export async function updateMedicalRecord(
    recordId: string,
    doctorId: string,
    updates: Partial<Pick<MedicalRecord, 'title' | 'description' | 'diagnosis'>>,
): Promise<{ success: boolean; data?: MedicalRecord; error?: string }> {
    const { data, error } = await supabase
        .from('medical_records')
        .update({
            ...updates,
            updated_by: doctorId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', recordId)
        .select()
        .single();

    if (error) {
        console.error('[updateMedicalRecord] error:', error);
        return { success: false, error: error.message };
    }
    return { success: true, data };
}

export async function deleteMedicalRecord(
    recordId: string,
): Promise<{ success: boolean; error?: string }> {
    // NOTE: .select('id') is required so Supabase returns the affected rows.
    // Without it, an RLS-blocked DELETE returns { data: null, error: null }
    // which is indistinguishable from a successful delete at the JS level.
    const { data, error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', recordId)
        .select('id');

    if (error) {
        console.error('[deleteMedicalRecord] error:', error);
        return { success: false, error: error.message };
    }

    // If data is empty the row either doesn't exist or RLS blocked the delete.
    if (!data || data.length === 0) {
        console.warn('[deleteMedicalRecord] no rows deleted – RLS may have blocked the operation');
        return {
            success: false,
            error: 'Could not delete the record. Make sure you have the correct permissions.',
        };
    }

    return { success: true };
}

export async function deletePrescription(
    prescriptionId: string,
): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', prescriptionId)
        .select('id');

    if (error) {
        console.error('[deletePrescription] error:', error);
        return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
        console.warn('[deletePrescription] no rows deleted – RLS may have blocked the operation');
        return {
            success: false,
            error: 'Could not delete the prescription. Make sure you have the correct permissions.',
        };
    }

    return { success: true };
}

export async function deleteConsultation(
    consultationId: string,
): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase
        .from('consultations')
        .delete()
        .eq('id', consultationId)
        .select('id');

    if (error) {
        console.error('[deleteConsultation] error:', error);
        return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
        console.warn('[deleteConsultation] no rows deleted – RLS may have blocked the operation');
        return {
            success: false,
            error: 'Could not delete the consultation. Make sure you have the correct permissions.',
        };
    }

    return { success: true };
}

// ---------------------------------------------------------------------------
// Prescriptions
// ---------------------------------------------------------------------------

export async function createPrescription(
    input: PrescriptionInput,
): Promise<{ success: boolean; data?: Prescription; error?: string }> {
    const { data, error } = await supabase
        .from('prescriptions')
        .insert({
            patient_id: input.patient_id,
            doctor_id: input.doctor_id,
            medications: input.medications,
            instructions: input.instructions,
            created_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('[createPrescription] error:', error);
        return { success: false, error: error.message };
    }
    return { success: true, data };
}

export async function fetchPrescriptionsForPatient(
    patientId: string,
): Promise<Prescription[]> {
    const { data, error } = await supabase
        .from('prescriptions')
        .select(`
            *,
            users!prescriptions_doctor_id_fkey (
                first_name,
                last_name
            )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[fetchPrescriptionsForPatient] error:', error);
        return [];
    }

    return (data ?? []).map((p: any) => ({
        ...p,
        doctor_name: p.users
            ? `Dr. ${p.users.first_name ?? ''} ${p.users.last_name ?? ''}`.trim()
            : 'Unknown Doctor',
    }));
}

// ---------------------------------------------------------------------------
// Consultation History
// ---------------------------------------------------------------------------

export async function createConsultation(
    input: ConsultationInput,
): Promise<{ success: boolean; data?: ConsultationRecord; error?: string }> {
    const { data, error } = await supabase
        .from('consultations')
        .insert({
            patient_id: input.patient_id,
            doctor_id: input.doctor_id,
            notes: input.notes,
            diagnosis: input.diagnosis,
            prescription_id: input.prescription_id ?? null,
            timestamp: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('[createConsultation] error:', error);
        return { success: false, error: error.message };
    }
    return { success: true, data };
}

export async function fetchConsultationsForPatient(
    patientId: string,
): Promise<ConsultationRecord[]> {
    const { data, error } = await supabase
        .from('consultations')
        .select(`
            *,
            users!consultations_doctor_id_fkey (
                first_name,
                last_name
            )
        `)
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('[fetchConsultationsForPatient] error:', error);
        return [];
    }

    return (data ?? []).map((c: any) => ({
        ...c,
        doctor_name: c.users
            ? `Dr. ${c.users.first_name ?? ''} ${c.users.last_name ?? ''}`.trim()
            : 'Unknown Doctor',
    }));
}

export async function fetchConsultationsForDoctor(
    doctorId: string,
): Promise<ConsultationRecord[]> {
    const { data, error } = await supabase
        .from('consultations')
        .select(`
            *,
            users!consultations_patient_id_fkey (
                first_name,
                last_name
            )
        `)
        .eq('doctor_id', doctorId)
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('[fetchConsultationsForDoctor] error:', error);
        return [];
    }

    return (data ?? []).map((c: any) => ({
        ...c,
        patient_name: c.users
            ? `${c.users.first_name ?? ''} ${c.users.last_name ?? ''}`.trim()
            : 'Unknown Patient',
    }));
}
