import "./globals.css";

export const metadata = {
  title: "Fashion Hub | Retail POS",
  description: "Premium retail point of sale for Fashion Hub",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
