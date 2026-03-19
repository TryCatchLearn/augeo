import type { ComponentPropsWithoutRef } from "react";

type NextLinkProps = ComponentPropsWithoutRef<"a"> & {
  href: string;
};

export function MockNextLink({ href, ...props }: NextLinkProps) {
  return <a href={href} {...props} />;
}
