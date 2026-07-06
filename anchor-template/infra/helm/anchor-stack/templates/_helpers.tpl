{{/* Namespace + name scheme, all derived from the anchor slug. */}}
{{- define "anchor.slug" -}}{{ .Values.anchor.slug }}{{- end -}}
{{- define "anchor.namespace" -}}anchor-{{ .Values.anchor.slug }}{{- end -}}

{{/* Public hostnames — explicit override wins, else derived from slug + domain. */}}
{{- define "anchor.host.sep" -}}
{{- if .Values.hosts.sep }}{{ .Values.hosts.sep }}{{- else }}{{ .Values.anchor.slug }}.{{ .Values.domain }}{{- end -}}
{{- end -}}
{{- define "anchor.host.api" -}}
{{- if .Values.hosts.api }}{{ .Values.hosts.api }}{{- else }}api.{{ .Values.anchor.slug }}.{{ .Values.domain }}{{- end -}}
{{- end -}}
{{- define "anchor.host.console" -}}
{{- if .Values.hosts.console }}{{ .Values.hosts.console }}{{- else }}console.{{ .Values.anchor.slug }}.{{ .Values.domain }}{{- end -}}
{{- end -}}

{{/* Fully-qualified image refs. */}}
{{- define "anchor.image.businessServer" -}}
{{ .Values.images.registry }}/{{ .Values.images.businessServer.repo }}:{{ .Values.images.businessServer.tag }}
{{- end -}}
{{- define "anchor.image.client" -}}
{{ .Values.images.registry }}/{{ .Values.images.client.repo }}:{{ .Values.images.client.tag }}
{{- end -}}
{{- define "anchor.image.anchorPlatform" -}}
{{ .Values.images.anchorPlatform.repo }}:{{ .Values.images.anchorPlatform.tag }}
{{- end -}}

{{- define "anchor.labels" -}}
app.kubernetes.io/part-of: nordstern-anchor
anchor.nordstern.io/slug: {{ .Values.anchor.slug }}
anchor.nordstern.io/network: {{ .Values.anchor.network }}
{{- end -}}
