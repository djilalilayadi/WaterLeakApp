import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
    ScrollView,
    SafeAreaView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { getUserLocation } from '../lib/gps';
import supabase from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme } from '../src/theme';
import { AppButton, AppInput, AppHeader } from '../src/components/UI';

export default function ReportLeakScreen({ navigation }) {
    const [image, setImage] = useState(null);
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);
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
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setImage(result.assets[0]);
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
                        price: parsedPrice
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
});
