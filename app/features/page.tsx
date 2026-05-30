import FeaturesHero from "@/components/Features/FeaturesHero";
import FeaturesSlider from "@/components/Features/FeaturesSlider";

export default function FeaturesPage() {
  return (
    <>
      <FeaturesHero />
      <div className="py-20">
        <FeaturesSlider />
      </div>
    </>
  );
}