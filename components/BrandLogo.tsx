import Image from "next/image";

type BrandLogoProps = {
  variant?: "header" | "sidebar" | "footer";
  priority?: boolean;
};

export default function BrandLogo({ variant = "header", priority = false }: BrandLogoProps) {
  const sizes = {
    header: "h-16 w-24 sm:h-[84px] sm:w-[126px]",
    sidebar: "h-24 w-36",
    footer: "h-[104px] w-[156px]",
  };

  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${variant === "footer" ? "rounded-xl bg-white px-3 py-2" : ""}`}>
      <Image
        src="/logo/finops-training-logo.png"
        alt="FinOps Trainings by CloudCadre"
        width={240}
        height={160}
        sizes={variant === "header" ? "(max-width: 640px) 96px, 126px" : variant === "sidebar" ? "144px" : "156px"}
        priority={priority}
        className={`object-contain ${sizes[variant]}`}
      />
    </span>
  );
}
