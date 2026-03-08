import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { CaneProvider, useCane } from './src/context/CaneContext';
import HomeScreen from './src/screens/HomeScreen';
import FacesScreen from './src/screens/FacesScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import SOSScreen from './src/screens/SOSScreen';

const Tab = createBottomTabNavigator();
const Root = createNativeStackNavigator();

const TAB_ICONS = ['⌂', '☺', '◎'];
const TAB_LABELS = ['Home', 'People', 'Tracking'];

function CustomTabBar({ state, navigation }: any) {
  return (
    <View style={tb.bar}>
      {state.routes.map((route: any, i: number) => {
        const focused = state.index === i;
        return (
          <TouchableOpacity
            key={route.key}
            style={tb.tab}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.6}
          >
            <View style={[tb.indicator, focused && tb.indicatorActive]} />
            <Text style={[tb.icon, focused && tb.iconActive]}>{TAB_ICONS[i]}</Text>
            <Text style={[tb.label, focused && tb.labelActive]}>{TAB_LABELS[i]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
    paddingBottom: 24,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: 6 },
  indicator: { width: 20, height: 2, borderRadius: 1, backgroundColor: 'transparent', marginBottom: 6 },
  indicatorActive: { backgroundColor: '#FF385C' },
  icon: { fontSize: 20, color: '#CCCCCC', marginBottom: 4 },
  iconActive: { color: '#222222' },
  label: { fontSize: 11, color: '#CCCCCC', fontWeight: '500' },
  labelActive: { color: '#222222', fontWeight: '600' },
});

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#222222' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Faces" component={FacesScreen} options={{ title: 'People' }} />
      <Tab.Screen name="Tracking" component={TrackingScreen} options={{ title: 'Tracking' }} />
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
