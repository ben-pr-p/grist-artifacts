import { useEffect } from "react";
import { useState } from "react";

export function useLocalStorage(key: string, initialValue: any) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      setValue(JSON.parse(storedValue));
    }
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

export function useSessionStorage(key: string, initialValue: any) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const storedValue = sessionStorage.getItem(key);
    if (storedValue) {
      setValue(JSON.parse(storedValue));
    }
  }, [key]);

  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
