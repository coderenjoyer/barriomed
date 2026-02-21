import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { BottomNavigation } from '../components/patient/bottomnav';
import { ServiceSelector, ServiceType } from '../components/patient/selectservice';
import { QueueTicket } from '../components/patient/queueticket';
import { BotikaPage } from '../components/patient/botikamanagement';
import { ImmunizationTimeline } from '../components/patient/immunotimeline';
import { FloatingActionButton } from '../components/patient/floatingactionbutton';
import { FamilyMemberCard, FamilyMember } from '../components/patient/yellowcard';
import { VaccineTimeline, VaccineRecord } from '../components/patient/vaccinetimeline';

// Mock Data for Family Members
const familyMembers: FamilyMember[] = [
    {
        id: '1',
        name: 'Sarah Anderson',
        relation: 'Me',
        pendingCount: 0,
        stats: { age: '28', weight: '55kg', height: '165cm', lastVisit: 'Dec 15' }
    },
    {
        id: '2',
        name: 'Mark Anderson',
        relation: 'Spouse',
        pendingCount: 0,
        stats: { age: '30', weight: '75kg', height: '178cm', lastVisit: 'Nov 20' }
    },
    {
        id: '3',
        name: 'Leo Anderson',
        relation: 'Son',
        pendingCount: 1,
        avatar: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80',
        stats: { age: '2', weight: '12kg', height: '85cm', lastVisit: 'Jan 10' }
    },
];

// Mock Data for Vaccines
const vaccineRecords: VaccineRecord[] = [
    { id: '1', vaccine: 'Hepatitis B (Dose 1)', date: '2022-01-15', status: 'completed', location: 'City Health Center' },
    { id: '2', vaccine: 'DTaP (Dose 1)', date: '2022-03-01', status: 'completed', location: 'City Health Center' },
    { id: '3', vaccine: 'Influenza', date: '2023-11-10', status: 'completed', location: 'Barrio Med Clinic' },
    { id: '4', vaccine: 'COVID-19 Booster', date: '2024-03-15', status: 'pending' },
];

interface UserDashboardProps {
    onLogout?: () => void;
}

export function UserDashboard({ onLogout }: UserDashboardProps) {
    const [activeTab, setActiveTab] = useState('home');
    const [isQueueing, setIsQueueing] = useState(false); // Set to true to show queue status
    const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showServiceSelector, setShowServiceSelector] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState('1');

    // Mock data for the ticket
    const [ticketData, setTicketData] = useState({
        queueNumber: 12,
        nowServing: 11,
        peopleAhead: 1,
        estWaitTime: '15 mins',
    });

    const handleServiceConfirm = () => {
        if (!selectedService) return;
        setIsLoading(true);
        setShowServiceSelector(false);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setIsQueueing(true);
            setActiveTab('queue'); // Auto switch to queue tab
        }, 1500);
    };

    const handleCancelQueue = () => {
        setIsQueueing(false);
        setSelectedService(null);
        setActiveTab('home');
    };

    const handleGetQueueNumber = () => {
        setShowServiceSelector(true);
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <Text style={styles.greetingText}>Good Morning,</Text>
                <Text style={styles.nameText}>Sarah Anderson</Text>
            </View>

            <View style={styles.headerRight}>
                <TouchableOpacity
                    onPress={onLogout}
                    style={styles.iconButton}
                >
                    <Feather name="log-out" size={20} color="#4B5563" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton}>
                    <Feather name="bell" size={20} color="#4B5563" />
                    <View style={styles.badge} />
                </TouchableOpacity>

                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80" }}
                        style={styles.avatar}
                    />
                </View>
            </View>
        </View>
    );

    const renderQueueStatusCard = () => (
        <View style={styles.queueCard}>
            <Text style={styles.queueCardLabel}>CURRENT POSITION</Text>
            <View style={styles.queueCardContent}>
                <View style={styles.queueNumberSection}>
                    <Text style={styles.queueNumberHash}>#</Text>
                    <Text style={styles.queueNumber}>{ticketData.queueNumber}</Text>
                    <Text style={styles.queueTotal}>/{ticketData.nowServing + ticketData.peopleAhead}</Text>
                </View>
                <View style={styles.queueCircle}>
                    <Text style={styles.queueCircleLabel}>Your Turn</Text>
                    <Text style={styles.queueCircleValue}>In {ticketData.peopleAhead}</Text>
                </View>
            </View>
            <View style={styles.queueDetails}>
                <View style={styles.queueDetailRow}>
                    <Feather name="clock" size={14} color="#0D9488" />
                    <Text style={styles.queueDetailText}>Est. Wait: {ticketData.estWaitTime}</Text>
                </View>
                <View style={styles.queueDetailRow}>
                    <Feather name="map-pin" size={14} color="#0D9488" />
                    <Text style={styles.queueDetailText}>Dr. Smith's Clinic, Room 302</Text>
                </View>
            </View>
        </View>
    );

    const renderQuickActions = () => (
        <View style={styles.quickActionsGrid}>
            <TouchableOpacity
                style={[styles.quickActionCard, styles.quickActionPrimary]}
                onPress={handleGetQueueNumber}
            >
                <View style={styles.quickActionIcon}>
                    <Feather name="search" size={16} color="white" />
                </View>
                <Text style={styles.quickActionText}>Get Queue Number</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionCard, styles.quickActionSecondary]}>
                <View style={styles.quickActionIcon}>
                    <FontAwesome5 name="file-prescription" size={16} color="white" />
                </View>
                <Text style={styles.quickActionText}>My Prescriptions</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.quickActionCard, styles.quickActionLight]}
                onPress={() => setActiveTab('botika')}
            >
                <View style={[styles.quickActionIcon, styles.quickActionIconLight]}>
                    <FontAwesome5 name="pills" size={16} color="#F97316" />
                </View>
                <Text style={styles.quickActionTextDark}>E-Botika Inventory</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.quickActionCard, styles.quickActionLight]}
                onPress={() => setActiveTab('records')}
            >
                <View style={[styles.quickActionIcon, styles.quickActionIconLight]}>
                    <Feather name="file-text" size={16} color="#3B82F6" />
                </View>
                <Text style={styles.quickActionTextDark}>Health Records</Text>
            </TouchableOpacity>
        </View>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {renderHeader()}
                        <View style={styles.homeContent}>
                            {isQueueing && renderQueueStatusCard()}
                            {renderQuickActions()}
                            <BotikaPage scrollEnabled={false} />
                            <ImmunizationTimeline />
                        </View>
                    </ScrollView>
                );
            case 'queue':
                if (!isQueueing) {
                    return (
                        <View style={styles.emptyStateContainer}>
                            <Feather name="calendar" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyStateTitle}>No Active Queue</Text>
                            <Text style={styles.emptyStateText}>Select a service from Home to get a number.</Text>
                            <TouchableOpacity
                                onPress={() => setActiveTab('home')}
                                style={styles.actionButton}
                            >
                                <Text style={styles.actionButtonText}>Go to Home</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }
                return (
                    <View style={styles.tabContent}>
                        <QueueTicket
                            serviceType={selectedService!}
                            queueNumber={ticketData.queueNumber}
                            nowServing={ticketData.nowServing}
                            peopleAhead={ticketData.peopleAhead}
                            estWaitTime={ticketData.estWaitTime}
                            onCancel={handleCancelQueue}
                        />
                    </View>
                );
            case 'botika':
                return (
                    <View style={{ flex: 1 }}>
                        <BotikaPage scrollEnabled={true} />
                    </View>
                );
            case 'records':
                return (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 }}>
                                Family Records
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -8 }}>
                                <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
                                    {familyMembers.map((member, index) => (
                                        <FamilyMemberCard
                                            key={member.id}
                                            member={member}
                                            isSelected={selectedMemberId === member.id}
                                            onClick={() => setSelectedMemberId(member.id)}
                                            index={index}
                                        />
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        <View style={{ paddingHorizontal: 24 }}>
                            <View style={styles.queueCard}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <View>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937' }}>
                                            {familyMembers.find(m => m.id === selectedMemberId)?.name}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#6B7280' }}>
                                            {familyMembers.find(m => m.id === selectedMemberId)?.relation} • {familyMembers.find(m => m.id === selectedMemberId)?.stats.age} yrs old
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={{ padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8 }}>
                                        <Feather name="edit-2" size={16} color="#4B5563" />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 16 }}>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12, color: '#6B7280' }}>Weight</Text>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1F2937' }}>{familyMembers.find(m => m.id === selectedMemberId)?.stats.weight}</Text>
                                    </View>
                                    <View style={{ width: 1, backgroundColor: '#F3F4F6' }} />
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12, color: '#6B7280' }}>Height</Text>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1F2937' }}>{familyMembers.find(m => m.id === selectedMemberId)?.stats.height}</Text>
                                    </View>
                                    <View style={{ width: 1, backgroundColor: '#F3F4F6' }} />
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12, color: '#6B7280' }}>Last Visit</Text>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1F2937' }}>{familyMembers.find(m => m.id === selectedMemberId)?.stats.lastVisit}</Text>
                                    </View>
                                </View>

                                <VaccineTimeline records={vaccineRecords} />
                            </View>
                        </View>
                    </ScrollView>
                );
            case 'chat':
                return (
                    <View style={styles.emptyStateContainer}>
                        <Feather name="message-circle" size={48} color="#D1D5DB" />
                        <Text style={styles.emptyStateTitle}>Chat Support</Text>
                        <Text style={styles.emptyStateText}>Coming Soon</Text>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* Decorative Background */}
            <View style={[styles.blurCircle, styles.blurCircleTop]} />
            <View style={[styles.blurCircle, styles.blurCircleBottom]} />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {renderContent()}
            </SafeAreaView>

            {activeTab === 'home' && <FloatingActionButton onPress={handleGetQueueNumber} />}

            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Service Selector Modal */}
            {showServiceSelector && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Service</Text>
                            <TouchableOpacity onPress={() => setShowServiceSelector(false)}>
                                <Feather name="x" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <ServiceSelector
                            selected={selectedService}
                            onSelect={setSelectedService}
                            onConfirm={handleServiceConfirm}
                            isLoading={isLoading}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100, // Space for bottom nav
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    headerLeft: {
        flexDirection: 'column',
    },
    greetingText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    nameText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        padding: 8,
        borderRadius: 999,
        backgroundColor: '#F3F4F6',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#CCFBF1',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    tabContent: {
        paddingHorizontal: 24,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        minHeight: 400,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    actionButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#0D9488',
        borderRadius: 12,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    // Background Elements
    blurCircle: {
        position: 'absolute',
        borderRadius: 9999,
        opacity: 0.4,
    },
    blurCircleTop: {
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        backgroundColor: '#CCFBF1', // teal-100
    },
    blurCircleBottom: {
        bottom: -50,
        left: -50,
        width: 250,
        height: 250,
        backgroundColor: '#EFF6FF', // blue-50
    },
    // Home Content
    homeContent: {
        paddingHorizontal: 24,
        gap: 24,
    },
    // Queue Status Card
    queueCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F0FDFA',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    queueCardLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B7280',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    queueCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    queueNumberSection: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    queueNumberHash: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#0D9488',
    },
    queueNumber: {
        fontSize: 56,
        fontWeight: 'bold',
        color: '#0D9488',
    },
    queueTotal: {
        fontSize: 20,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    queueCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F0FDFA',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#0D9488',
    },
    queueCircleLabel: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '500',
    },
    queueCircleValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0D9488',
    },
    queueDetails: {
        gap: 8,
    },
    queueDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    queueDetailText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    // Quick Actions
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
    },
    quickActionCard: {
        width: '47%',
        height: 112,
        borderRadius: 16,
        padding: 16,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    quickActionPrimary: {
        backgroundColor: '#0D9488',
    },
    quickActionSecondary: {
        backgroundColor: '#10B981',
    },
    quickActionLight: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    quickActionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActionIconLight: {
        backgroundColor: '#FEF3C7',
    },
    quickActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    quickActionTextDark: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    // Modal Styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
});