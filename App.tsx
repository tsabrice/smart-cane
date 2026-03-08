import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaneProvider, useCane } from './src/context/CaneContext';
import HomeScreen from './src/screens/HomeScreen';
import FacesScreen from './src/screens/FacesScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import SOSScreen from './src/screens/SOSScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Colors } from './src/utils/theme';

const Tab = createBottomTabNavigator();
const Root = createNativeStackNavigator();

function TabIcon({ name, focused, sosActive }: { name: string; focused: boolean; sosActive: boolean }) {
  const color = focused ? Colors.accent : Colors.textMuted;
  const icons: Record<string, string> = {
    Home: '⌂', Track: '⊙', People: '◎', Settings: '⚙',
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 18, color, fontWeight: focused ? '700' : '400' }}>
        {icons[name] ?? '●'}
      </Text>
      {name === 'Home' && sosActive && (
        <View style={{
          position: 'absolute', top: -3, right: -8,
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: Colors.danger,
        }} />
      )}
    </View>
  );
}

function MainTabs() {
  const { sos } = useCane();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: Colors.textPrimary },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.divider,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} sosActive={sos.active} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Smart Cane' }} />
      <Tab.Screen name="Track" component={TrackingScreen} options={{ title: 'Track' }} />
      <Tab.Screen name="People" component={FacesScreen} options={{ title: 'People' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      <Root.Screen name="Main" component={MainTabs} />
      <Root.Screen
        name="SOS"
        component={SOSScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
    </Root.Navigator>
  );
}

function SOSNavigationEffect({ navigationRef }: { navigationRef: any }) {
  const { sos } = useCane();
  useEffect(() => {
    if (sos.active && navigationRef.current) {
      navigationRef.current.navigate('SOS');
    }
  }, [sos.active]);
  return null;
}

export default function App() {
  const navigationRef = React.useRef<any>(null);
  return (
    <SafeAreaProvider>
      <CaneProvider>
        <NavigationContainer ref={navigationRef}>
          <SOSNavigationEffect navigationRef={navigationRef} />
          <RootNavigator />
        </NavigationContainer>
      </CaneProvider>
    </SafeAreaProvider>
  );
}
