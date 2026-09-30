import { ProductArea } from '../components/product-area';
import { Shell } from '../components/shell';
export default function JobsPage() {
  return (
    <Shell>
      <ProductArea
        eyebrow="Jobs"
        title="Job listings are not available yet."
        detail="VouchNet does not show fabricated jobs. The jobs database, organization permission model, applications, and recruiter workflow remain to be implemented."
      />
    </Shell>
  );
}
