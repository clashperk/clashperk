const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default {
  async growth(
    collection: any[] = [],
    { addition, deletion, growth }: { addition: number; deletion: number; growth: number }
  ) {
    const total = collection.reduce(
      (pre, curr) => Number(pre) + Number(curr.value.addition - curr.value.deletion),
      0
    );
    const body = {
      backgroundColor: 'white',
      width: 500,
      height: 300,
      devicePixelRatio: 2.0,
      format: 'png',
      chart: {
        type: 'bar',
        data: {
          labels: [
            ...collection.map(
              (d: any) => `${months[d.date.getMonth()]!} ${d.date.getDate() as number}`
            )
          ],
          datasets: [
            {
              type: 'bar',
              label: `Addition`,
              backgroundColor: '#36a2eb80',
              borderColor: '#36a2eb',
              data: [...collection.map((d) => d.value.addition)]
            },
            {
              type: 'bar',
              label: 'Deletion',
              backgroundColor: '#ff638480',
              borderColor: '#ff6384',
              data: [...collection.map((d) => Math.abs(d.value.deletion))]
            },
            {
              type: 'line',
              label: 'Growth',
              backgroundColor: '#69c49a',
              borderColor: '#69c49a',
              fill: false,
              data: [...collection.map((d) => d.value.addition - d.value.deletion)]
            }
          ]
        },
        options: {
          responsive: true,
          legend: {
            position: 'top',
            display: true,
            labels: {
              fontSize: 10,
              padding: 4,
              borderWidth: 0,
              boxWidth: 10
            }
          },
          title: {
            display: true,
            fontSize: 10,
            padding: 2,
            text: [
              `Total ${total as number} | Server Growth (${collection.length}D) | Today ${addition}/${deletion}/${growth}`
            ]
          }
        }
      }
    };

    const data = (await fetch(`https://quickchart.io/chart/create`, {
      body: JSON.stringify(body),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then((res) => res.json())) as { url: string };
    return data.url;
  }
};
