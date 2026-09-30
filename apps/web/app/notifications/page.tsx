import { ProductArea } from '../components/product-area';
import { Shell } from '../components/shell';
export default function NotificationsPage() {
  return (
    <Shell>
      <ProductArea
        eyebrow="Notifications"
        title="Notifications are not available yet."
        detail="Network actions persist today, but a notification store and delivery surface have not been implemented. This page intentionally contains no fake activity."
      />
    </Shell>
  );
}
