import { Button, Chip } from "@heroui/react";
import { ArrowRight, Sparkles } from "lucide-react";

function PageHeader({ badge, title, description, ctaLabel }) {
  return (
    <header className="ios-panel relative overflow-hidden rounded-lg p-4 sm:p-5 md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80 dark:bg-white/5" />
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3 sm:gap-4">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-tele-primary text-white shadow-lg sm:flex">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 space-y-2">
            {badge ? (
              <Chip className="app-chip w-fit" variant="flat">
                {badge}
              </Chip>
            ) : null}
            <h1 className="break-words text-[1.6rem] font-semibold leading-tight text-tele-dark sm:text-2xl md:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-3xl text-sm leading-6 text-gray-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {ctaLabel ? (
          <Button
            className="w-full bg-tele-primary text-white shadow-lg sm:w-fit lg:min-w-40"
            endContent={<ArrowRight size={17} />}
          >
            {ctaLabel}
          </Button>
        ) : null}
      </div>
    </header>
  );
}

export default PageHeader;
