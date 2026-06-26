/**
 * Signals API endpoints
 */

import { api } from "./client"
import type { Signal } from "@/types"

export const signalsApi = {
  getActive: () => api.get<Signal[]>("/signals/active"),
}
