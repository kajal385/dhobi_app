import React, { useEffect, useRef } from 'react';
import {
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
  role?: 'delivery_boy' | 'owner';
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  role = 'delivery_boy',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // Select splash graphic based on role
  const splashSource =
    role === 'owner'
      ? require('../assets/splash_owner.png')
      : require('../assets/splash_delivery.png');

  useEffect(() => {
    Animated.sequence([
      // Fade in & subtle zoom
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
      // Display duration
      Animated.delay(1800),
      // Fade out screen
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onFinish) {
        onFinish();
      }
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <Animated.View
        style={[
          styles.imageWrapper,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={splashSource}
          style={styles.fullImage}
          resizeMode="cover"
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  fullImage: {
    width: width,
    height: height,
  },
});
