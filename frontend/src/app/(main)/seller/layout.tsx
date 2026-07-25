import SellerLayout from '@/components/seller/seller-layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SellerLayout>{children}</SellerLayout>;
}
