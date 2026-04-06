"use client";

import { forwardRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

type SubmitButtonProps = {
  text?: string;
  className?: string;
  disabled?: boolean;
};

const SubmitButton = forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({ text, className, disabled }, ref) => {
    const { pending } = useFormStatus();

    return (
      <Button
        ref={ref}
        type="submit"
        disabled={pending || disabled}
        className={cn("flex gap-x-2", className)}
      >
        {text || "Submit"}
        {pending ? (
          <FontAwesomeIcon icon={faSpinner} className="text-lg animate-spin" />
        ) : null}
      </Button>
    );
  },
);

SubmitButton.displayName = "SubmitButton";

export default SubmitButton;
