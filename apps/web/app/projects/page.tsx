import { ProductArea } from '../components/product-area';
import { Shell } from '../components/shell';
export default function ProjectsPage() {
  return (
    <Shell>
      <ProductArea
        eyebrow="Projects"
        title="Project publishing is not connected yet."
        detail="The foundation schema exists, but project creation, visibility rules, and profile integration are not complete end-to-end."
        nextHref="/onboarding"
        nextLabel="Update your profile"
      />
    </Shell>
  );
}
