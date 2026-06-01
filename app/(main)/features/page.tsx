import FeaturesHero from "@/components/Features/FeaturesHero";
import FeaturesSlider from "@/components/Features/FeaturesSlider";
import CTA from "@/components/Landing/CTA";

export default function FeaturesPage() {
  return (
    <>
      <FeaturesHero />
      <div className="py-20">
        <FeaturesSlider />
      </div>
      <CTA
        heading="Stop juggling apps. Start running jobs."
        description="Start your free 14-day trial. No credit card required. No software to install."
        buttonText="Start free trial"
        buttonHref="/signup"
        showSecondaryButton={false}
      />
    </>
  );
}