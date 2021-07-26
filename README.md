# node-batis

```typescript
import NodeBatis from "node-batis";

...


(async () => {
    const nodeBatis = NodeBatis.getInstance();
    const xmlDbPath = `${__dirname}/api/db/map`; // xml 파일 위치
    nodeBatis.init(xmlDbPath, true);

    const param = {
      param: 1,
    };

    const query = await nodeBatis.getStatement({
      mapFile: "user", // xml 파일명
      id: "select_test", // xml 쿼리문 id
      param,
    });
})();
```

### xml 파일

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<mapper>
	<select id="select_test">
		SELECT *
          FROM TB_BASC_TERM
		WHERE 1 = #{param}
	</select>

</mapper>
```
