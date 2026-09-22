import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "Fashion Hub | Retail POS",
  description: "Premium retail point of sale for Fashion Hub",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
