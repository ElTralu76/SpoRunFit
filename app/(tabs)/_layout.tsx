import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color }: { name: IoniconName; color: string }) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#1a1a1a',
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#e85d04',
        tabBarInactiveTintColor: '#3a3a3a',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color }) => <TabIcon name="list-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="new-session"
        options={{
          title: 'Ajouter',
          tabBarIcon: ({ color }) => <TabIcon name="add-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'PRs',
          tabBarIcon: ({ color }) => <TabIcon name="trophy-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programmes',
          tabBarIcon: ({ color }) => <TabIcon name="barbell-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <TabIcon name="globe-outline" color={color} />,
          href: null, // caché pour l'instant
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <TabIcon name="person-circle-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
