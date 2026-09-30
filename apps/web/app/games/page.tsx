import { ProductArea } from '../components/product-area';
import { Shell } from '../components/shell';
export default function GamesPage() {
  return (
    <Shell>
      <ProductArea
        eyebrow="Games"
        title="Games are not part of this build yet."
        detail="VouchNet will not simulate daily puzzles or social game activity before a real game system exists."
      />
    </Shell>
  );
}
