import { ProductArea } from '../components/product-area';
import { Shell } from '../components/shell';
export default function ExplorePage() {
  return (
    <Shell>
      <ProductArea
        eyebrow="Explore"
        title="Explore is being connected to real content."
        detail="There are no sample posts, organizations, jobs, or recommendations shown here. Discovery of people is available from Network."
        nextHref="/network/discover"
        nextLabel="Discover people"
      />
    </Shell>
  );
}
