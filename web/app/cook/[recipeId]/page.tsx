import CookContent from './CookContent';

// Generate static params for static export
// We return a dummy path to satisfy the build, but client-side routing will handle dynamic paths
export function generateStaticParams() {
  return [{ recipeId: '_' }];
}

export default function CookPage() {
  return <CookContent />;
}
