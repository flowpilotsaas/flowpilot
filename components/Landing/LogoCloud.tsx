import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';

type Logo = {
  src: string;
  alt: string;
};

const logos: Logo[] = [
  {
    src: 'https://svgl.app/library/nvidia-wordmark-light.svg',
    alt: 'Nvidia',
  },
  {
    src: 'https://svgl.app/library/supabase_wordmark_light.svg',
    alt: 'Supabase',
  },
  {
    src: 'https://svgl.app/library/openai_wordmark_light.svg',
    alt: 'OpenAI',
  },
  {
    src: 'https://svgl.app/library/turso-wordmark-light.svg',
    alt: 'Turso',
  },
  {
    src: 'https://svgl.app/library/vercel_wordmark.svg',
    alt: 'Vercel',
  },
  {
    src: 'https://svgl.app/library/github_wordmark_light.svg',
    alt: 'GitHub',
  },
  {
    src: 'https://svgl.app/library/claude-ai-wordmark-icon_light.svg',
    alt: 'Claude AI',
  },
  {
    src: 'https://svgl.app/library/clerk-wordmark-light.svg',
    alt: 'Clerk',
  },
];

export default function LogoCloud() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4 text-center mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-1">
          Trusted by field service teams
        </p>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          The companies keeping crews moving use Flow Pilot
        </h2>
      </div>

      <div className="relative mx-auto max-w-3xl bg-gradient-to-r from-secondary via-transparent to-secondary py-6 md:border-x">
        {/* top rule spanning full viewport width */}
        <div className="-translate-x-1/2 -top-px pointer-events-none absolute left-1/2 w-screen border-t" />

        <InfiniteSlider gap={42} reverse speed={60} speedOnHover={20}>
          {logos.map((logo) => (
            <img
              key={logo.alt}
              src={logo.src}
              alt={logo.alt}
              width="auto"
              height="auto"
              loading="lazy"
              className="pointer-events-none h-4 select-none md:h-5 dark:brightness-0 dark:invert"
            />
          ))}
        </InfiniteSlider>

        <ProgressiveBlur
          blurIntensity={1}
          className="pointer-events-none absolute top-0 left-0 h-full w-[160px]"
          direction="left"
        />
        <ProgressiveBlur
          blurIntensity={1}
          className="pointer-events-none absolute top-0 right-0 h-full w-[160px]"
          direction="right"
        />

        {/* bottom rule spanning full viewport width */}
        <div className="-translate-x-1/2 -bottom-px pointer-events-none absolute left-1/2 w-screen border-b" />
      </div>
    </section>
  );
}
