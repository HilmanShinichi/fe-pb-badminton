// Compatibility barrel: shared UI now lives under src/components/*
// (atomic design: atoms / molecules / organisms / layouts).
// Existing `from "../ui"` imports keep working; new code should import
// from the component folders directly.
export {
  Badge,
  Btn,
  DeleteRowButton,
  Empty,
  ErrorBox,
  GenderChip,
  GradeChip,
  LanguageSwitcher,
  Loading,
  MoneyInput,
  OpenLink,
  ClubLogo,
  IconCrown3D,
  IconMedalSilver3D,
  IconMedalBronze3D,
  getPlayerInitials,
} from "./components/atoms";
export { ConfirmModal, Field, Panel, LogoUploadModal, ProfitDetailModal } from "./components/molecules";
export { PageHead } from "./components/organisms/PageHead";
export { Layout } from "./components/layouts/AppLayout";
