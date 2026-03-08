import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { CaneProvider, useCane } from './src/context/CaneContext';
import HomeScreen from './src/screens/HomeScreen';
import FacesScreen from './src/screens/FacesScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import SOSScreen from './src/screens/SOSScreen';

const Tab = createBottomTabNavigator();
const Root = createNativeStackNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '●',
    Faces: '◉',
    Tracking: '◎',
  };
  return (
    <Text style={{ fontSize: focused ? 20 : 16, color: focused ? '#3b82f6' : '#94a3b8' }}>
      {icons[label] ?? label}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: '#f8fafc' },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#1e293b' },
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e8f0' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Smart Cane' }} />
      <Tab.Screen name="Faces" component={FacesScreen} options={{ title: 'Registered Faces' }} />
      <Tab.Screen name="Tracking" component={TrackingScreen} options={{ title: 'GPS Tracking' }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { sos } = useCane();
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

// Auto-navigate to SOS screen when triggered
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
    <CaneProvider>
      <NavigationContainer ref={navigationRef}>
        <SOSNavigationEffect navigationRef={navigationRef} />
        <RootNavigator />
      </NavigationContainer>
    </CaneProvider>
  );
}
