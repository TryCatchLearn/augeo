import { ViewTransition } from "react";

export default function Template({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ViewTransition
      default="none"
      enter="route-crossfade"
      exit="route-crossfade"
    >
      {children}
    </ViewTransition>
  );
}
