import { useState, type FormEvent } from "react";
import { Logo } from "../components/AppHeader";
import { Button, TextField } from "../components/ui";
import { authErrorMessage, resetPassword, signIn, signUp } from "../lib/auth";
import { seedNewAccount } from "../lib/store";
import { toast } from "../lib/toast";

export function Login() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const creating = mode === "signUp";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (creating) seedNewAccount((await signUp(email.trim(), password)).user.uid);
      else await signIn(email.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return setError("Enter your email first, then press Forgot password.");
    try {
      await resetPassword(email.trim());
      setError("");
      toast(`Sent a reset link to ${email.trim()}.`);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-5 border-2 bg-card p-6 hard-sm">
        <Logo />
        <div>
          <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.035em]">{creating ? "Create an account" : "Sign in"}</h1>
          <p className="text-[13px] text-muted-foreground">Your patterns and progress follow you to any device.</p>
        </div>
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={setEmail} />
        <TextField
          label="Password"
          type="password"
          autoComplete={creating ? "new-password" : "current-password"}
          minLength={6}
          required
          value={password}
          onChange={setPassword}
        />
        {error && (
          <p role="alert" className="border-2 bg-destructive px-3 py-2 text-[13px] font-semibold text-destructive-foreground">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          {creating ? "Create account" : "Sign in"}
        </Button>
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => {
              setMode(creating ? "signIn" : "signUp");
              setError("");
            }}
          >
            {creating ? "I already have an account" : "Create an account"}
          </button>
          {!creating && (
            <button type="button" className="text-muted-foreground underline underline-offset-2" onClick={forgot}>
              Forgot password?
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
