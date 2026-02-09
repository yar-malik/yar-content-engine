export const metadata = {
  title: "Content Engine",
  description: "Generate social content from your creator library.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", padding: 24 }}>
        {children}
      </body>
    </html>
  );
}
