import { useState } from "react";
import { useI18n } from "../i18n";
import {
  useListOpenPlaySessionsQuery,
  useGetOpenPlaySessionQuery,
  useGetOpenPlayParticipantsQuery,
  useJoinOpenPlaySessionMutation,
  useCancelOpenPlayParticipationMutation,
} from "../store/openPlayApi";
import { Badge, Btn, Empty, ErrorBox, Field, Loading, PageHead } from "../ui";
import { ApiError } from "../store/baseApi";
import type { ParticipantType } from "../types";

export function OpenPlayPage() {
  const { t, dateFormatted } = useI18n();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [joinType, setJoinType] = useState<ParticipantType>("MEMBER");
  const [error, setError] = useState("");

  // Queries
  const sessionsQuery = useListOpenPlaySessionsQuery({ status: "OPEN" });
  const sessionQuery = useGetOpenPlaySessionQuery(selectedSessionId || "", {
    skip: !selectedSessionId,
  });
  const participantsQuery = useGetOpenPlayParticipantsQuery(selectedSessionId || "", {
    skip: !selectedSessionId,
  });

  // Mutations
  const [joinSession, joinState] = useJoinOpenPlaySessionMutation();
  const [cancelParticipation, cancelState] = useCancelOpenPlayParticipationMutation();

  const session = sessionQuery.data;
  const participants = participantsQuery.data;

  async function handleJoin() {
    if (!selectedSessionId) return;
    try {
      await joinSession({
        sessionId: selectedSessionId,
        player_id: "", // Will be filled by the user
        participant_type: joinType,
      }).unwrap();
      setError("");
      // Refresh participants list
      participantsQuery.refetch();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("openPlay.joinFailed"));
    }
  }

  if (sessionsQuery.isLoading) return <Loading />;

  const sessions = sessionsQuery.data || [];

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHead title={t("openPlay.title")} sub={t("openPlay.description")} />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr] w-full min-w-0 items-start">
        {/* Sessions List */}
        <section aria-label="Sessions" className="h-fit rounded-xl border border-line bg-white shadow-card p-4 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-line/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-court text-pine">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-ink">{t("openPlay.availableSessions")}</h2>
          </div>

          {sessions.length === 0 ? (
            <Empty text={t("openPlay.noSessions")} />
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedSessionId === s.id
                      ? "bg-court/10 border-court text-court"
                      : "bg-bg border-line/40 text-ink hover:bg-bg/60"
                  }`}
                >
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-ink/60 mt-1">
                    {dateFormatted(s.schedule_date)} • {s.start_time}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Session Details */}
        {session && (
          <section aria-label="Session details" className="space-y-5">
            <div className="rounded-xl border border-line bg-white shadow-card p-6">
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-ink">{session.name}</h1>
                {session.description && <p className="text-ink/60 mt-2">{session.description}</p>}
              </div>

              {error && <ErrorBox error={error} />}

              {/* Session Info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-bg rounded-lg">
                <div>
                  <span className="text-xs text-ink/60">{t("openPlay.scheduleDate")}</span>
                  <div className="font-medium">{dateFormatted(session.schedule_date)}</div>
                </div>
                <div>
                  <span className="text-xs text-ink/60">{t("openPlay.startTime")}</span>
                  <div className="font-medium">{session.start_time}</div>
                </div>
                {session.venue_id && (
                  <div>
                    <span className="text-xs text-ink/60">{t("openPlay.venue")}</span>
                    <div className="font-medium">{session.venue_id}</div>
                  </div>
                )}
              </div>

              {/* Slots Display */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-4 rounded-lg border border-line bg-bg">
                  <div className="text-xs text-ink/60">{t("openPlay.memberSlots")}</div>
                  <div className="text-2xl font-bold text-court mt-2">
                    {session.registered_member_count || 0}/{session.max_members}
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-line bg-bg">
                  <div className="text-xs text-ink/60">{t("openPlay.nonMemberSlots")}</div>
                  <div className="text-2xl font-bold text-court mt-2">
                    {session.registered_non_member_count || 0}/{session.max_non_members}
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-line bg-bg">
                  <div className="text-xs text-ink/60">{t("openPlay.waitingList")}</div>
                  <div className="text-2xl font-bold text-court mt-2">
                    {session.waiting_list_count || 0}/{session.max_waiting_list}
                  </div>
                </div>
              </div>

              {/* Join Form */}
              <div className="border-t border-line pt-6">
                <h3 className="font-bold text-ink mb-4">{t("openPlay.joinSession")}</h3>

                <div className="space-y-3.5 mb-4">
                  <Field label={t("openPlay.participationType")}>
                    <select
                      value={joinType}
                      onChange={(e) => setJoinType(e.target.value as ParticipantType)}
                      className="w-full px-3 py-2 rounded-lg border border-line bg-white text-ink"
                    >
                      <option value="MEMBER">{t("openPlay.memberType")}</option>
                      <option value="NON_MEMBER">{t("openPlay.nonMemberType")}</option>
                    </select>
                  </Field>
                </div>

                <Btn
                  onClick={handleJoin}
                  loading={joinState.isLoading}
                  disabled={
                    joinState.isLoading ||
                    session.status !== "OPEN" ||
                    (joinType === "MEMBER" && session.registered_member_count === session.max_members && session.waiting_list_count === session.max_waiting_list) ||
                    (joinType === "NON_MEMBER" && session.registered_non_member_count === session.max_non_members && session.waiting_list_count === session.max_waiting_list)
                  }
                  className="w-full"
                >
                  {t("openPlay.join")}
                </Btn>
              </div>
            </div>

            {/* Participants List */}
            {participants && (
              <div className="rounded-xl border border-line bg-white shadow-card p-6">
                <h2 className="text-lg font-bold text-ink mb-4">{t("openPlay.registeredMembers")}</h2>

                <div className="space-y-6">
                  {participants.members && participants.members.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-ink/80 mb-3">{t("openPlay.memberType")}</h3>
                      <div className="space-y-2">
                        {participants.members.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                            <span className="text-sm text-ink">{p.player_name}</span>
                            <Badge color="blue">{t("openPlay.registered")}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {participants.non_members && participants.non_members.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-ink/80 mb-3">{t("openPlay.nonMemberType")}</h3>
                      <div className="space-y-2">
                        {participants.non_members.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                            <span className="text-sm text-ink">{p.player_name}</span>
                            <Badge color="blue">{t("openPlay.registered")}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {participants.waiting_list && participants.waiting_list.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-ink/80 mb-3">{t("openPlay.waitingList")}</h3>
                      <div className="space-y-2">
                        {participants.waiting_list.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-bg rounded-lg">
                            <span className="text-sm text-ink">{p.player_name}</span>
                            <Badge color="yellow">{t("openPlay.waiting")}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
