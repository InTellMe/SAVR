import TransferContent from './TransferContent';

// Generate static params for static export
// We return a dummy path to satisfy the build, but client-side routing will handle dynamic paths
export function generateStaticParams() {
  return [{ token: '_' }];
}

export default function TransferPage() {
  return <TransferContent />;
}
