import { baseApi } from "./baseApi";

export const openPlayApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Public endpoints - no auth needed
    listOpenPlaySessions: builder.query({
      query: (params?: { status?: string; from_date?: string; to_date?: string }) => ({
        url: "/public/open-play",
        params,
      }),
      providesTags: ["OpenPlay"],
    }),

    getOpenPlaySession: builder.query({
      query: (id: string) => `/public/open-play/${id}`,
      providesTags: ["OpenPlaySession"],
    }),

    getOpenPlayParticipants: builder.query({
      query: (id: string) => `/public/open-play/${id}/participants`,
      providesTags: ["OpenPlayParticipants"],
    }),

    // Member endpoints - auth needed
    joinOpenPlaySession: builder.mutation({
      query: ({ sessionId, ...body }) => ({
        url: `/open-play/${sessionId}/join`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["OpenPlaySession", "OpenPlayParticipants"],
    }),

    cancelOpenPlayParticipation: builder.mutation({
      query: ({ sessionId, participantId, ...body }) => ({
        url: `/open-play/${sessionId}/participants/${participantId}/cancel`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["OpenPlaySession", "OpenPlayParticipants"],
    }),

    // Admin endpoints
    createOpenPlaySession: builder.mutation({
      query: (body) => ({
        url: "/open-play",
        method: "POST",
        body,
      }),
      invalidatesTags: ["OpenPlay"],
    }),

    updateOpenPlaySession: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/open-play/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["OpenPlaySession"],
    }),

    deleteOpenPlaySession: builder.mutation({
      query: (id: string) => ({
        url: `/open-play/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["OpenPlay"],
    }),

    getPendingCancellations: builder.query({
      query: (id: string) => `/open-play/${id}/cancellations`,
      providesTags: ["OpenPlayCancellations"],
    }),

    approveCancellation: builder.mutation({
      query: ({ sessionId, cancellationId, ...body }) => ({
        url: `/open-play/${sessionId}/cancellations/${cancellationId}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["OpenPlayCancellations", "OpenPlayParticipants"],
    }),

    removeParticipant: builder.mutation({
      query: ({ sessionId, participantId }) => ({
        url: `/open-play/${sessionId}/participants/${participantId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["OpenPlaySession", "OpenPlayParticipants"],
    }),
  }),
});

export const {
  useListOpenPlaySessionsQuery,
  useGetOpenPlaySessionQuery,
  useGetOpenPlayParticipantsQuery,
  useJoinOpenPlaySessionMutation,
  useCancelOpenPlayParticipationMutation,
  useCreateOpenPlaySessionMutation,
  useUpdateOpenPlaySessionMutation,
  useDeleteOpenPlaySessionMutation,
  useGetPendingCancellationsQuery,
  useApproveCancellationMutation,
  useRemoveParticipantMutation,
} = openPlayApi;
