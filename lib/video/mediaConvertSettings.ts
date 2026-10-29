import type { CreateJobCommandInput } from "@aws-sdk/client-mediaconvert";
import { videoOutputPrefix } from "./outputPaths";

export function mediaConvertSettings(source: { tenantId: string; assetId: string; sourceKey: string; bucket: string }, jobId: string, attemptId: string, role: string): CreateJobCommandInput {
  if (!/^arn:aws[a-z-]*:iam::\d{12}:role\/.+/.test(role)) throw new Error("MEDIACONVERT_ROLE_MISSING");
  const prefix = videoOutputPrefix(source, jobId, attemptId);
  return {
    Role: role, ClientRequestToken: `${jobId}-${attemptId}`, StatusUpdateInterval: "SECONDS_60",
    UserMetadata: { tenantId: source.tenantId, assetId: source.assetId, jobId, attemptId },
    Settings: {
      TimecodeConfig: { Source: "ZEROBASED" },
      Inputs: [{ FileInput: `s3://${source.bucket}/${source.sourceKey}`, TimecodeSource: "ZEROBASED",
        AudioSelectors: { "Audio Selector 1": { SelectorType: "TRACK", Tracks: [1], DefaultSelection: "NOT_DEFAULT" } } }],
      OutputGroups: [{ Name: "Private lesson segments", OutputGroupSettings: { Type: "HLS_GROUP_SETTINGS", HlsGroupSettings: {
        Destination: `s3://${source.bucket}/${prefix}/stream`, SegmentLength: 6, MinSegmentLength: 0,
        ManifestDurationFormat: "FLOATING_POINT", OutputSelection: "MANIFESTS_AND_SEGMENTS", SegmentControl: "SEGMENTED_FILES",
      } }, Outputs: [{ NameModifier: "_720p", ContainerSettings: { Container: "M3U8", M3u8Settings: {} },
        VideoDescription: { Width: 1280, Height: 720, ScalingBehavior: "FIT_NO_UPSCALE", CodecSettings: { Codec: "H_264", H264Settings: {
          RateControlMode: "QVBR", MaxBitrate: 2500000, QvbrSettings: { QvbrQualityLevel: 7 },
          GopSize: 6, GopSizeUnits: "SECONDS", GopClosedCadence: 1, SceneChangeDetect: "DISABLED",
          FramerateControl: "INITIALIZE_FROM_SOURCE", QualityTuningLevel: "SINGLE_PASS",
        } } },
        AudioDescriptions: [{ AudioSourceName: "Audio Selector 1", CodecSettings: { Codec: "AAC", AacSettings: { Bitrate: 96000, CodingMode: "CODING_MODE_2_0", SampleRate: 48000 } } }],
      }] }],
    },
  };
}
