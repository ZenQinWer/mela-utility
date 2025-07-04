import { namespace } from '@api/routes/{TYPE1}';
import { {TYPE3} } from '@api/_mock-data/request-types';

import _data from './_data.json';
import _error from './_error.json';

const {TYPE2} = {
    namespace,
    data: [],
    services: [
        new {TYPE3}({
            timing: 1000,
            handler({ schema, namespace, request, pluralize}) {
                return _data;
            }
        })
    ]
};

export default {TYPE2};
