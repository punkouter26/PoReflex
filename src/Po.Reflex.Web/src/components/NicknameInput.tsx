import { useState, useCallback, useEffect } from "react";

interface NicknameInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange: (isValid: boolean) => void;
}

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const VALID_PATTERN = /^[A-Za-z0-9_]*$/;

/**
 * Controlled nickname input with real-time validation.
 * Rules match the server-side NicknameValidator (3-20 alphanumeric + underscore).
 */
export function NicknameInput({
  value,
  onChange,
  onValidChange,
}: NicknameInputProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const [touched, setTouched] = useState(false);

  const validateNickname = useCallback(
    (val: string): { isValid: boolean; error: string } => {
      if (val.length === 0) return { isValid: false, error: "" };
      if (val.length < MIN_LENGTH)
        return {
          isValid: false,
          error: `Nickname must be at least ${MIN_LENGTH} characters`,
        };
      if (val.length > MAX_LENGTH)
        return {
          isValid: false,
          error: `Nickname must be at most ${MAX_LENGTH} characters`,
        };
      if (!VALID_PATTERN.test(val))
        return {
          isValid: false,
          error: "Only letters, numbers, and underscores allowed",
        };
      return { isValid: true, error: "" };
    },
    []
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value.replace(/[^A-Za-z0-9_]/g, "");
      if (newValue.length > MAX_LENGTH) newValue = newValue.slice(0, MAX_LENGTH);

      onChange(newValue);

      if (touched || newValue.length > 0) {
        setTouched(true);
        const { isValid, error } = validateNickname(newValue);
        setErrorMessage(error);
        setHasError(!isValid && touched);
        onValidChange(isValid);
      }
    },
    [onChange, onValidChange, touched, validateNickname]
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
    const { isValid, error } = validateNickname(value);
    setErrorMessage(error);
    setHasError(!isValid);
    onValidChange(isValid);
  }, [value, validateNickname, onValidChange]);

  // Re-validate when value changes externally (e.g. restored from localStorage)
  useEffect(() => {
    if (value.length > 0) {
      const { isValid } = validateNickname(value);
      onValidChange(isValid);
    }
  }, [value, validateNickname, onValidChange]);

  return (
    <div className="nickname-input-wrapper">
      <input
        type="text"
        className={`nickname-input ${hasError ? "error" : ""}`}
        placeholder="Enter nickname (3-20 chars)"
        value={value}
        onChange={handleInput}
        onBlur={handleBlur}
        maxLength={MAX_LENGTH}
        data-testid="nickname-input"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
      />

      {errorMessage && touched && (
        <p className="validation-error" data-testid="nickname-error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
