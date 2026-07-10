"use client";

import { useEffect, useRef } from "react";

export default function AutoRetryFailed({
  projectId,
  status,
}: {
  projectId: string;
  status: string;
}) {
  const retried = useRef(false);

  useEffect(() => {
    if (status !== "FAILED" || retried.current) return;
    retried.current = true;

    fetch(`/api/projects/${projectId}/retry`, { method: "POST" }).catch(
      () => {}
    );
  }, [projectId, status]);

  return null;
}
