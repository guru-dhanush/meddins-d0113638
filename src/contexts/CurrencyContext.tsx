import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getCurrencyForCountry } from "@/lib/currency";

interface CurrencyContextType {
  userCurrency: string;
  userCountry: string;
  loading: boolean;
  setCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType>({
  userCurrency: "USD",
  userCountry: "",
  loading: true,
  setCurrency: () => {},
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [userCurrency, setUserCurrency] = useState(() => {
    return localStorage.getItem("user_currency") || "USD";
  });
  const [userCountry, setUserCountry] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If user already has a stored preference, use that
    const stored = localStorage.getItem("user_currency");
    if (stored) {
      setUserCurrency(stored);
      setLoading(false);
      return;
    }

    // Detect country via free IP geolocation API
    const detect = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          const country = data.country_code || "";
          setUserCountry(country);
          const currency = getCurrencyForCountry(country);
          setUserCurrency(currency);
          localStorage.setItem("user_currency", currency);
        }
      } catch {
        // Fallback to USD
      } finally {
        setLoading(false);
      }
    };

    detect();
  }, []);

  const setCurrency = (code: string) => {
    setUserCurrency(code);
    localStorage.setItem("user_currency", code);
  };

  return (
    <CurrencyContext.Provider value={{ userCurrency, userCountry, loading, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};
