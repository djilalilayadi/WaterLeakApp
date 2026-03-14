import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
    ScrollView,
    SafeAreaView,
    ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { getUserLocation } from '../lib/gps';
import { analyzeLeakImage } from '../lib/gemini';
import supabase from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../src/theme';
import { AppButton, AppInput, AppHeader } from '../src/components/UI';

const SEVERITY_COLORS = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#EAB308',
    low: '#22C55E',
    unknown: '#6B7280',
};

const SEVERITY_EMOJI = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
    unknown: '⚪',
};

export default function ReportLeakScreen({ navigation }) {
    const [image, setImage] = useState(null);
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const { userId } = useAuth();

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.2, // Strongly compress for network speed
            width: 800,   // Downsize 12MP+ camera photos so the base64 string is tiny
            base64: true,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            setImage(asset);
            setAiResult(null);

            // Run AI analysis
            setAnalyzing(true);
            try {
                const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: 'base64',
                });
                
                // Upload to Supabase Storage temporarily for AI to read
                const arrayBuffer = Buffer.from(base64, 'base64');
                const tempFileName = `${userId}/temp_ai_${Date.now()}.jpg`;
                
                const { error: uploadError } = await supabase.storage
                    .from('image')
                    .upload(tempFileName, arrayBuffer, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw new Error('Failed to upload temp image for AI: ' + uploadError.message);

                const { data: { publicUrl } } = supabase.storage
                    .from('image')
                    .getPublicUrl(tempFileName);

                // Pass the fast CDN URL instead of a massive base64 payload
                const analysis = await analyzeLeakImage(publicUrl);
                setAiResult(analysis);
                
                // Cleanup temp file in background
                supabase.storage.from('image').remove([tempFileName]).catch(e => console.log('Cleanup error', e));

            } catch (err) {
                console.error('[AI] Analysis error:', err);
                setAiResult({
                    severity: 'unknown',
                    description: 'Could not analyze',
                    estimated_flow: 'unknown',
                });
            } finally {
                setAnalyzing(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!image) {
            Alert.alert('Error', 'Please take a photo of the leak');
            return;
        }

        if (!description.trim()) {
            Alert.alert('Error', 'Please provide a short description');
            return;
        }

        if (!String(price ?? '').trim()) {
            Alert.alert('Error', 'Please enter the offered price (DZD)');
            return;
        }

        const parsedPrice = Number(String(price).replace(/[^\d]/g, ''));
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            Alert.alert('Error', 'Please enter a valid offered price (DZD)');
            return;
        }

        setLoading(true);
        try {
            const location = await getUserLocation();
            if (!location) {
                throw new Error('Could not get your location. Please ensure GPS is enabled.');
            }

            const fileName = `${userId}/${Date.now()}.jpg`;
            const base64 = await FileSystem.readAsStringAsync(image.uri, {
                encoding: 'base64',
            });
            const arrayBuffer = Buffer.from(base64, 'base64');

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('image')
                .upload(fileName, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('image')
                .getPublicUrl(fileName);

            const { data: requestData, error: dbError } = await supabase
                .from('leak_requests')
                .insert([
                    {
                        client_id: userId,
                        photo_url: publicUrl,
                        description: description,
                        client_lat: location.latitude,
                        client_lng: location.longitude,
                        status: 'pending',
                        price: parsedPrice,
                        severity: aiResult?.severity || 'unknown',
                        ai_description: aiResult?.description || null,
                    }
                ])
                .select()
                .single();

            if (dbError) throw dbError;

            navigation.navigate('Waiting', { requestId: requestData.id });

        } catch (error) {
            console.error(error);
            Alert.alert('Submission Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const severityColor = aiResult ? SEVERITY_COLORS[aiResult.severity] || SEVERITY_COLORS.unknown : null;
    const severityEmoji = aiResult ? SEVERITY_EMOJI[aiResult.severity] || SEVERITY_EMOJI.unknown : null;

    return (
        <View style={styles.container}>
            <AppHeader title="New Request" />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity
                    style={[
                        styles.photoArea,
                        image && styles.photoAreaActive
                    ]}
                    onPress={takePhoto}
                >
                    {image ? (
                        <View style={styles.imageWrapper}>
                            <Image source={{ uri: image.uri }} style={styles.previewImage} />
                            <View style={styles.successBadge}>
                                <Text style={styles.successBadgeText}>✓</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.placeholderContent}>
                            <Text style={styles.cameraIconText}>📷</Text>
                            <Text style={styles.placeholderText}>Tap to photograph the leak</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* AI Analysis Loading */}
                {analyzing && (
                    <View style={styles.analyzingRow}>
                        <ActivityIndicator size="small" color={theme.colors.accent} />
                        <Text style={styles.analyzingText}>🔍 Analyzing leak...</Text>
                    </View>
                )}

                {/* AI Analysis Result Card */}
                {aiResult && !analyzing && (
                    <View style={[styles.aiCard, { borderColor: severityColor + '60' }]}>
                        <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
                            <Text style={styles.severityEmoji}>{severityEmoji}</Text>
                            <Text style={[styles.severityLabel, { color: severityColor }]}>
                                {aiResult.severity.toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.aiDescription}>{aiResult.description}</Text>
                        <View style={styles.flowRow}>
                            <Text style={styles.flowLabel}>Flow:</Text>
                            <Text style={styles.flowValue}>{aiResult.estimated_flow}</Text>
                        </View>
                    </View>
                )}

                <AppInput
                    label="Problem Description"
                    placeholder="Describe the leak location and severity..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    height={100}
                />

                <AppInput
                    label="Offered Price (DZD)"
                    placeholder="e.g. 2000"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                />

                <View style={{ marginTop: 'auto', paddingBottom: 20 }}>
                    <AppButton
                        title="Send Request"
                        onPress={handleSubmit}
                        loading={loading}
                    />

                    <AppButton
                        title="Back to My Requests"
                        onPress={() => navigation.navigate('ClientDashboard')}
                        variant="outline"
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
    },
    photoArea: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
    },
    photoAreaActive: {
        borderStyle: 'solid',
        borderColor: theme.colors.border,
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    successBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.white,
    },
    successBadgeText: {
        color: theme.colors.white,
        fontWeight: 'bold',
        fontSize: 18,
    },
    placeholderContent: {
        alignItems: 'center',
    },
    cameraIconText: {
        fontSize: 32,
        marginBottom: 12,
    },
    placeholderText: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
    },
    // AI Analysis styles
    analyzingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        gap: 8,
    },
    analyzingText: {
        ...theme.typography.body,
        color: theme.colors.accent,
        fontWeight: '600',
    },
    aiCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        borderWidth: 1.5,
        padding: 16,
        marginBottom: 20,
    },
    severityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        marginBottom: 10,
        gap: 6,
    },
    severityEmoji: {
        fontSize: 14,
    },
    severityLabel: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    aiDescription: {
        ...theme.typography.body,
        color: theme.colors.textPrimary,
        marginBottom: 8,
    },
    flowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    flowLabel: {
        ...theme.typography.caption,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    flowValue: {
        ...theme.typography.caption,
        color: theme.colors.textPrimary,
        fontWeight: '700',
    },
});
