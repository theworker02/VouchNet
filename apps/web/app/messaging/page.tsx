import { ProductArea } from '../components/product-area';
import { Shell } from '../components/shell';
export default function MessagingPage() {
  return (
    <Shell>
      <ProductArea
        eyebrow="Messaging"
        title="Messages are not available yet."
        detail="No demonstration conversations are displayed. Conversation persistence, delivery, message permissions, and abuse controls are still missing."
      />
    </Shell>
  );
}
