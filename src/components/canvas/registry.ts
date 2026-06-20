import type { NodeTypes, EdgeTypes } from "@xyflow/react";
import { RequestInputsNode } from "./nodes/RequestInputsNode";
import { CropImageNode } from "./nodes/CropImageNode";
import { GeminiNode } from "./nodes/GeminiNode";
import { ResponseNode } from "./nodes/ResponseNode";
import { DataEdge } from "./edges/DataEdge";

export const nodeTypes: NodeTypes = {
  "request-inputs": RequestInputsNode,
  "crop-image": CropImageNode,
  gemini: GeminiNode,
  response: ResponseNode,
};

export const edgeTypes: EdgeTypes = {
  data: DataEdge,
};
