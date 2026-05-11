import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, focused }: { name: IoniconName; color: string; focused: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={focused ? [styles.activeIconWrap, { backgroundColor: theme.orange + '18' }] : undefined}>
      <Ionicons name={name} size={focused ? 22 : 21} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: theme.tabBorder,
          borderTopWidth: 1,
          height: 66,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={[theme.tabBg1, theme.tabBg2]}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarActiveTintColor: theme.orange,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.4,
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, focused }) => <TabIcon name="list-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="new-session"
        options={{
          title: 'Ajouter',
          tabBarIcon: ({ color, focused }) => <TabIcon name="add-circle-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'PRs',
          tabBarIcon: ({ color, focused }) => <TabIcon name="trophy-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programmes',
          tabBarIcon: ({ color, focused }) => <TabIcon name="barbell-outline" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => <TabIcon name="globe-outline" color={color} focused={focused} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => <TabIcon name="person-circle-outline" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 10,
  },
});
