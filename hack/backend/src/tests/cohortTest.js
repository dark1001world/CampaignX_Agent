import { getCustomerCohort } from "../services/customerService.js"

const runTest = async () => {

  const customers = await getCustomerCohort()

  console.log("Customers fetched:", customers.length)
}

runTest()