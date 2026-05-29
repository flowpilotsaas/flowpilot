import Hero        from "@/components/Landing/Hero";
import LogoCloud   from "@/components/Landing/LogoCloud";
import Features    from "@/components/Landing/Features";
import HowItWorks  from "@/components/Landing/HowItWorks";
import Testimonials from "@/components/Landing/Testimonials";
import CTA         from "@/components/Landing/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CTA />
    </>
  );
}
