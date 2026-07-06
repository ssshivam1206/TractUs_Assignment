import { DashboardHome } from '@/components/dashboard-home';
import { OrganisationProvider } from '@/state/organisation-context';

export default function Home() {
  return (
    <OrganisationProvider>
      <DashboardHome />
    </OrganisationProvider>
  );
}
