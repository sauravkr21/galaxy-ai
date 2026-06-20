import { defaultData } from "@/lib/nodes";
import type {
  CropImageData,
  GeminiData,
  RequestInputsData,
  ResponseData,
  WorkflowGraph,
} from "@/types/flow";

// A hosted product photo so the sample's vision step works out of the box.
// Replace with your own Transloadit upload from the Request-Inputs node.
const SAMPLE_IMAGE =
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1024&q=80";

export const SAMPLE_WORKFLOW_NAME = "Product Marketing Post (Sample)";

/** The blank starter every new workflow opens with: Request-Inputs + Response. */
export function buildStarterGraph(): WorkflowGraph {
  return {
    nodes: [
      {
        id: "request-inputs",
        type: "request-inputs",
        position: { x: 80, y: 280 },
        data: defaultData("request-inputs"),
      },
      {
        id: "response",
        type: "response",
        position: { x: 720, y: 320 },
        data: { ...(defaultData("response") as ResponseData), resultKey: "result" },
      },
    ],
    edges: [],
  };
}

/** The exact required sample DAG from the assignment brief. */
export function buildSampleGraph(): WorkflowGraph {
  const ri: RequestInputsData = {
    ...(defaultData("request-inputs") as RequestInputsData),
    textField:
      "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
    imageUrl: SAMPLE_IMAGE,
    imageName: "product-photo.jpg",
  };

  const crop1: CropImageData = {
    ...(defaultData("crop-image") as CropImageData),
    label: "Crop Image #1",
    x: 20,
    y: 20,
    w: 60,
    h: 60,
  };
  const crop2: CropImageData = {
    ...(defaultData("crop-image") as CropImageData),
    label: "Crop Image #2",
    x: 0,
    y: 0,
    w: 100,
    h: 50,
  };

  const gem1: GeminiData = {
    ...(defaultData("gemini") as GeminiData),
    label: "Gemini 3.1 Pro #1",
    systemPrompt:
      "You are a marketing copywriter. Write a one-paragraph product description.",
  };
  const gem2: GeminiData = {
    ...(defaultData("gemini") as GeminiData),
    label: "Gemini 3.1 Pro #2",
    systemPrompt:
      "Condense the following product description into a tweet-length hook (under 240 characters).",
  };
  const gem3: GeminiData = {
    ...(defaultData("gemini") as GeminiData),
    label: "Gemini 3.1 Pro #3 (Final)",
    systemPrompt:
      "You are a social media manager. Combine the tweet hook and the two product crops into a final marketing post.",
  };

  const resp: ResponseData = {
    ...(defaultData("response") as ResponseData),
    resultKey: "gemini_3_1_pro",
  };

  return {
    nodes: [
      { id: "request-inputs", type: "request-inputs", position: { x: 0, y: 300 }, data: ri },
      { id: "gemini-1", type: "gemini", position: { x: 440, y: -40 }, data: gem1 },
      { id: "crop-1", type: "crop-image", position: { x: 440, y: 380 }, data: crop1 },
      { id: "crop-2", type: "crop-image", position: { x: 440, y: 700 }, data: crop2 },
      { id: "gemini-2", type: "gemini", position: { x: 900, y: 40 }, data: gem2 },
      { id: "gemini-3", type: "gemini", position: { x: 1360, y: 320 }, data: gem3 },
      { id: "response", type: "response", position: { x: 1840, y: 400 }, data: resp },
    ],
    edges: [
      // Request-Inputs fans out.
      { id: "e-ri-gem1", source: "request-inputs", sourceHandle: "text_field", target: "gemini-1", targetHandle: "prompt" },
      { id: "e-ri-crop1", source: "request-inputs", sourceHandle: "image_field", target: "crop-1", targetHandle: "input_image" },
      { id: "e-ri-crop2", source: "request-inputs", sourceHandle: "image_field", target: "crop-2", targetHandle: "input_image" },
      // Gemini chain.
      { id: "e-gem1-gem2", source: "gemini-1", sourceHandle: "response", target: "gemini-2", targetHandle: "prompt" },
      { id: "e-gem2-gem3", source: "gemini-2", sourceHandle: "response", target: "gemini-3", targetHandle: "prompt" },
      // Both crops feed the final Gemini's vision input.
      { id: "e-crop1-gem3", source: "crop-1", sourceHandle: "output", target: "gemini-3", targetHandle: "image" },
      { id: "e-crop2-gem3", source: "crop-2", sourceHandle: "output", target: "gemini-3", targetHandle: "image" },
      // Final result.
      { id: "e-gem3-resp", source: "gemini-3", sourceHandle: "response", target: "response", targetHandle: "result" },
    ],
  };
}
