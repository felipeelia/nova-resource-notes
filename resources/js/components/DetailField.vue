<template>
    <div class="notes-field py-3 px-6 w-full">
        <Heading :level="3" class="mb-3">{{ field.name }}</Heading>

        <p v-if="loading" class="text-gray-500">{{ __('Loading') }}...</p>

        <ul v-else-if="notes.length" class="divide-y divide-gray-100 dark:divide-gray-700 mb-4">
            <li v-for="note in notes" :key="note.id.value" class="flex items-start py-3">
                <div class="flex-1 min-w-0">
                    <p class="text-sm">
                        <strong>{{ creatorName(note) }}</strong>
                        <span class="text-xs text-gray-500"> · {{ fieldValue(note, 'time_ago') }}</span>
                    </p>
                    <p class="notes-field__text mt-1">{{ fieldValue(note, 'note') }}</p>
                </div>

                <button
                    v-if="note.authorizedToDelete"
                    type="button"
                    class="ml-3 text-gray-400 hover:text-red-500"
                    :title="__('Delete')"
                    @click="noteToDelete = note"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                </button>
            </li>
        </ul>

        <p v-else class="text-gray-500 mb-4">{{ __('No notes yet.') }}</p>

        <div v-if="prevPageUrl || nextPageUrl" class="flex justify-between mb-4 text-sm">
            <button type="button" class="link-default" :disabled="! prevPageUrl" @click="goToPage(page - 1)">
                {{ __('Previous') }}
            </button>
            <button type="button" class="link-default" :disabled="! nextPageUrl" @click="goToPage(page + 1)">
                {{ __('Next') }}
            </button>
        </div>

        <textarea
            v-model="note"
            class="w-full form-control form-input form-control-bordered py-3 h-auto"
            rows="4"
            :placeholder="__('Type a note, and press enter.')"
            :disabled="saving"
            @keydown.enter="addNote"
        />

        <DeleteResourceModal
            :show="noteToDelete !== null"
            mode="delete"
            :resource-name="field.resourceName"
            @confirm="deleteNote"
            @close="noteToDelete = null"
        />
    </div>
</template>

<script>
export default {
    props: ['resource', 'resourceName', 'resourceId', 'field'],

    data: () => ({
        loading: true,
        saving: false,
        notes: [],
        note: '',
        noteToDelete: null,
        page: 1,
        prevPageUrl: null,
        nextPageUrl: null,
    }),

    mounted() {
        this.getNotes()
    },

    computed: {
        viaParameters() {
            return {
                viaResource: this.resourceName,
                viaResourceId: this.resourceId,
                viaRelationship: this.field.hasManyRelationship,
            }
        },
    },

    methods: {
        async getNotes() {
            const { data } = await Nova.request().get(`/nova-api/${this.field.resourceName}`, {
                params: {
                    ...this.viaParameters,
                    relationshipType: 'hasMany',
                    page: this.page,
                },
            })

            this.notes = data.resources
            this.prevPageUrl = data.prevPageUrl
            this.nextPageUrl = data.nextPageUrl
            this.loading = false
        },

        goToPage(page) {
            this.page = page
            this.getNotes()
        },

        async addNote(event) {
            // Shift+Enter adds a new line instead.
            if (event.shiftKey) {
                return
            }

            event.preventDefault()

            if (! this.note.trim() || this.saving) {
                return
            }

            const formData = new FormData()
            formData.append('note', this.note)
            Object.entries(this.viaParameters).forEach(([key, value]) => formData.append(key, value))

            this.saving = true

            try {
                await Nova.request().post(`/nova-api/${this.field.resourceName}`, formData)
                this.note = ''
                this.page = 1
                await this.getNotes()
            } catch (error) {
                Nova.error(error.response?.data?.message || this.__('There was a problem submitting the form.'))
            } finally {
                this.saving = false
            }
        },

        async deleteNote() {
            const note = this.noteToDelete
            this.noteToDelete = null

            await Nova.request().delete(`/nova-api/${this.field.resourceName}`, {
                params: { ...this.viaParameters, resources: [note.id.value] },
            })

            this.getNotes()
        },

        fieldValue(note, attribute) {
            const field = note.fields.find(field => field.attribute === attribute)

            return field ? field.value : null
        },

        creatorName(note) {
            const creator = this.fieldValue(note, 'creator')

            if (! creator) {
                return ''
            }

            return creator.name || [creator.first_name, creator.last_name].filter(Boolean).join(' ') || creator.email
        },
    },
}
</script>

<style>
.notes-field__text {
    white-space: pre-wrap;
}
</style>
