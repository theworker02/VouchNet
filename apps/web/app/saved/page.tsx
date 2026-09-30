import { ProductArea } from '../components/product-area';
import { Shell } from '../components/shell';
export default function SavedPage() {
  return (
    <Shell>
      <ProductArea
        eyebrow="Saved"
        title="Saved content is not available yet."
        detail="Posts and private saved records have not been implemented, so this page does not present placeholder items."
      />
    </Shell>
  );
}
