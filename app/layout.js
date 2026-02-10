import "./globals.css";

export const metadata = {
  title: "Content Engine",
  description: "Generate social content from your creator library.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
