<template>
    <div class="{TYPE2}">
        {{ getLocalizationProp('Data.Text') }}
    </div>
</template>

<script>
    import localizationMixin from '@common/source/js/vue/mixins/localization';

    export default {
        name: '{TYPE5}',
        mixins: [ localizationMixin]
    };
</script>
