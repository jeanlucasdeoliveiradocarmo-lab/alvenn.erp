import "./globals.css";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: {
    default: "Alvenn ERP",
    template: "%s",
  },
  description: "Alvenn ERP — gestão de leads e funil de vendas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}<ThemeToggle /></body>
    </html>
  );
}
