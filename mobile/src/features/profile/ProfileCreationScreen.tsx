// src/features/profile/ProfileCreationScreen.tsx
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setStep, submitProfile, validateStep } from './profileSlice';
import { updateUser } from '../auth/authSlice';
import { ProfileStep } from './types';
import { logger } from '../../utils/logger';

import { ProgressBar } from './components/ProgressBar';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { PhotosStep } from './steps/PhotosStep';
import { InterestsStep } from './steps/InterestsStep';
import { GoalsStep } from './steps/GoalsStep';
import { LocationStep } from './steps/LocationStep';

const STEPS: ProfileStep[] = ['basics', 'photos', 'interests', 'goals', 'location'];

export const ProfileCreationScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentStep, isSubmitting, error, ...profileState } = useAppSelector(
    (state) => state.profile
  );
  const { user } = useAppSelector((state) => state.auth);

  const currentIndex = STEPS.indexOf(currentStep);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;

  const goNext = useCallback(async () => {
    try {
      const isValid = await dispatch(validateStep({ step: currentStep, data: profileState })).unwrap();
      if (!isValid) return;

      if (currentIndex < STEPS.length - 1) {
        dispatch(setStep(STEPS[currentIndex + 1]));
        return;
      }

      logger.log('ProfileCreation: Submitting profile...');
      const result = await dispatch(submitProfile());
      logger.log('ProfileCreation: Submit result:', result);

      if (submitProfile.fulfilled.match(result)) {
        logger.log('ProfileCreation: Success, updating user state...');
        // Map flat UserProfileDto back to the nested User shape the navigator expects.
        // AppNavigator gates on user.profile.completedAt — must be nested, not top-level.
        const p = result.payload as any;
        dispatch(updateUser({
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          isVisible: p.isVisible,
          subscriptionTier: p.subscriptionTier,
          profile: {
            ...user?.profile,
            bio: p.bio,
            age: p.age,
            gender: p.gender,
            interestedIn: p.interestedIn,
            interests: p.interests,
            goals: p.goals,
            photoUrls: p.photoUrls,
            completedAt: p.completedAt ?? new Date().toISOString(),
          },
        }));
        logger.log('ProfileCreation: User state updated');
      } else {
        logger.log('ProfileCreation: Submit failed:', result.payload);
      }
    } catch (err) {
      logger.error('ProfileCreation: goNext error:', err);
    }
  }, [currentIndex, dispatch, profileState, currentStep, user]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      dispatch(setStep(STEPS[currentIndex - 1]));
    }
  }, [currentIndex, dispatch]);

  const renderStep = () => {
    switch (currentStep) {
      case 'basics':
        return <BasicInfoStep onNext={goNext} />;
      case 'photos':
        return <PhotosStep onNext={goNext} onBack={goBack} />;
      case 'interests':
        return <InterestsStep onNext={goNext} onBack={goBack} />;
      case 'goals':
        return <GoalsStep onNext={goNext} onBack={goBack} />;
      case 'location':
        return <LocationStep onNext={goNext} onBack={goBack} isSubmitting={isSubmitting} error={error} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={progress} steps={STEPS} currentStep={currentStep} />
      <View style={styles.content}>{renderStep()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
});
